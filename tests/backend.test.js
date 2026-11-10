import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';

const catalog = { roles: [{ id: 'software' }, { id: 'aiml' }], rounds: ['hr','projects','dsa','cs','ml','behavioural'].map(id=>({id})), personas: ['supportive','formal','detail','challenging'].map(id=>({id})), difficulties: ['beginner','intermediate','advanced'].map(id=>({id})), durations: [10,20,30] };
const report = { mode: 'practice', summary: 'Reflection', criteria: [], strengths: [], improvements: [], nextSteps: [], disclaimer: 'Not scored.' };
const settings = { role:'software', round:'cs', persona:'formal', difficulty:'beginner', durationMinutes:10, context:'' };
async function fixture(overrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'interview-test-'));
  const engine = { catalog, getMode:()=> 'practice', nextQuestion:async s=>`Question ${s.turns.length + 1}`, evaluate:async ()=> report, ...overrides };
  const app = createApp({ dbPath:join(directory,'test.sqlite'), engine });
  await new Promise(resolve => app.server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  async function request(path, { method='GET', value, cookie, headers={} }={}) {
    const response = await fetch(origin+path, {method,headers:{...(value === undefined ? {} : {'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...headers},body:value===undefined?undefined:JSON.stringify(value)});
    return {status:response.status, body:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0], headers:response.headers};
  }
  async function register(email='student@example.com') { return request('/api/auth/register',{method:'POST',value:{name:'Student',email,password:'a-good-password'}}); }
  return { ...app, engine, request, register, origin, directory, dispose:async()=>{await app.close();await rm(directory,{recursive:true,force:true});} };
}

test('account cookies, login, logout and wrong credentials', async t=>{
  const f=await fixture(); t.after(f.dispose);
  assert.equal((await f.request('/api/me')).body.user,null);
  const auth=await f.register(); assert.equal(auth.status,201); assert.match(auth.headers.get('set-cookie'),/HttpOnly/); assert.match(auth.headers.get('set-cookie'),/SameSite=Lax/);
  const me=await f.request('/api/me',{cookie:auth.cookie}); assert.equal(me.body.user.email,'student@example.com'); assert.equal(me.body.user.password_hash,undefined);
  assert.equal((await f.register()).status,409);
  assert.equal((await f.request('/api/auth/login',{method:'POST',value:{email:'student@example.com',password:'wrong-password'}})).status,401);
  const login=await f.request('/api/auth/login',{method:'POST',value:{email:'STUDENT@example.com',password:'a-good-password'}}); assert.equal(login.status,200);
  await f.request('/api/auth/logout',{method:'POST',cookie:auth.cookie,value:{}});
  assert.equal((await f.request('/api/me',{cookie:auth.cookie})).body.user,null);
});

test('session ownership and deletion are enforced',async t=>{
  const f=await fixture();t.after(f.dispose);
  const a=await f.register(); const b=await f.register('other@example.com');
  const created=await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:settings});assert.equal(created.status,201);
  const id=created.body.session.id;
  for(const method of ['GET','DELETE']) assert.equal((await f.request(`/api/sessions/${id}`,{method,cookie:b.cookie})).status,404);
  assert.equal((await f.request(`/api/sessions/${id}/finish`,{method:'POST',cookie:b.cookie,value:{}})).status,404);
  assert.deepEqual((await f.request('/api/sessions',{cookie:b.cookie})).body.sessions,[]);
  assert.equal((await f.request(`/api/sessions/${id}`,{method:'DELETE',cookie:a.cookie})).status,200);
  assert.equal((await f.request(`/api/sessions/${id}`,{cookie:a.cookie})).status,404);
});

test('answers survive provider failure and retries do not duplicate',async t=>{
  const f=await fixture();t.after(f.dispose);const a=await f.register();
  const created=await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:settings});const id=created.body.session.id;
  f.engine.nextQuestion=async()=>{throw new Error('secret-provider-error');};
  const input={answer:'My answer',expectedTurnCount:1};
  let response=await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:input});
  assert.equal(response.status,503);assert.ok(!JSON.stringify(response.body).includes('secret-provider-error'));
  let saved=(await f.request(`/api/sessions/${id}`,{cookie:a.cookie})).body.session;assert.equal(saved.turns[0].answer,input.answer);assert.equal(saved.turns.length,1);
  f.engine.nextQuestion=async()=> 'Follow up';
  response=await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:input});assert.equal(response.status,200);assert.equal(response.body.session.turns.length,2);
  response=await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:input});assert.equal(response.status,200);assert.equal(response.body.session.turns.length,2);
  assert.equal((await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:{...input,answer:'Different'}})).status,409);
});

test('finish evaluates answered turns only and completed sessions reject answers',async t=>{
  let evaluated;
  const f=await fixture({evaluate:async s=>{evaluated=s;return report;}});t.after(f.dispose);const a=await f.register();
  const id=(await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:settings})).body.session.id;
  assert.equal((await f.request(`/api/sessions/${id}/finish`,{method:'POST',cookie:a.cookie,value:{}})).status,400);
  await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:{answer:'Evidence',expectedTurnCount:1}});
  const result=await f.request(`/api/sessions/${id}/finish`,{method:'POST',cookie:a.cookie,value:{}});
  assert.equal(result.body.session.status,'completed');assert.equal(evaluated.turns.length,1);assert.equal(evaluated.turns[0].answer,'Evidence');
  assert.equal((await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:{answer:'extra',expectedTurnCount:2}})).status,409);
  assert.equal((await f.request(`/api/sessions/${id}/finish`,{method:'POST',cookie:a.cookie,value:{}})).status,200);
});

test('cross-site writes, invalid settings and missing authentication are rejected',async t=>{
  const f=await fixture();t.after(f.dispose);
  assert.equal((await f.request('/api/sessions')).status,401);
  assert.equal((await f.request('/api/auth/register',{method:'POST',value:{},headers:{Origin:'https://evil.example'}})).status,403);
  const a=await f.register();
  assert.equal((await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:{...settings,durationMinutes:99}})).status,400);
  assert.equal((await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:{...settings,context:'x'.repeat(12001)}})).status,400);
  assert.equal((await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:{...settings,persona:'rude'}})).status,400);
  assert.equal((await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:settings,headers:{'Content-Type':'text/plain'}})).status,415);
});

test('concurrent answer and deletion are serialized',async t=>{
  let release;let started;
  const entered=new Promise(resolve=>{started=resolve;});
  const f=await fixture();t.after(f.dispose);const a=await f.register();
  const id=(await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:settings})).body.session.id;
  f.engine.nextQuestion=async()=>{started();await new Promise(resolve=>{release=resolve;});return 'Next';};
  const pending=f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:{answer:'saved',expectedTurnCount:1}});
  await entered;
  assert.equal((await f.request(`/api/sessions/${id}`,{method:'DELETE',cookie:a.cookie})).status,409);
  release();assert.equal((await pending).status,200);
});

test('question budget completes session and last-answer replay is idempotent',async t=>{
  const f=await fixture();t.after(f.dispose);const a=await f.register();
  const id=(await f.request('/api/sessions',{method:'POST',cookie:a.cookie,value:settings})).body.session.id;
  let result;
  for(let i=1;i<=4;i++) result=await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:{answer:`Answer ${i}`,expectedTurnCount:i}});
  assert.equal(result.body.session.status,'completed');assert.equal(result.body.session.turns.length,4);
  const replay=await f.request(`/api/sessions/${id}/answers`,{method:'POST',cookie:a.cookie,value:{answer:'Answer 4',expectedTurnCount:4}});
  assert.equal(replay.status,200);assert.equal(replay.body.session.status,'completed');
});
