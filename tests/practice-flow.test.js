import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createApp } from '../server/app.js';
import * as engine from '../server/engine.js';

test('example environment starts in practice mode without credentials', () => {
  const env = { ...process.env, AI_API_KEY: '', AI_MODEL: '', AI_BASE_URL: '' };
  // env-file values have lower priority than inherited variables: remove them to test the example.
  delete env.AI_API_KEY; delete env.AI_MODEL; delete env.AI_BASE_URL;
  const result = spawnSync(process.execPath, ['--env-file=.env.example', '--input-type=module', '-e', "import {getMode} from './server/engine.js'; console.log(getMode())"], {env, encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'practice');
});

test('all six rounds complete through real practice engine and API', async t => {
  const app = createApp({dbPath: ':memory:', engine: {...engine, getMode: ()=>'practice'}});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(()=>app.close());
  const origin=`http://127.0.0.1:${app.server.address().port}`;
  let cookie='';
  async function request(path, method='GET', value) {
    const r=await fetch(origin+path,{method,headers:{Cookie:cookie,...(value!==undefined?{'Content-Type':'application/json'}:{})},body:value!==undefined?JSON.stringify(value):undefined});
    if(r.headers.get('set-cookie')) cookie=r.headers.get('set-cookie').split(';')[0];
    const data=await r.json();
    assert.ok(r.ok,JSON.stringify(data));
    return data;
  }
  await request('/api/auth/register','POST',{name:'Flow test',email:'flow@example.test',password:'test-password-only'});
  for (const [index, round] of engine.catalog.rounds.entries()) {
    let {session}=await request('/api/sessions','POST',{role:index%2?'aiml':'software',round:round.id,persona:engine.catalog.personas[index%4].id,difficulty:'intermediate',durationMinutes:10,context:'I built a college project with a small team.'});
    for(let turn=1;turn<=4;turn++) {
      ({session}=await request(`/api/sessions/${session.id}/answers`,'POST',{expectedTurnCount:turn,answer:'I compared two approaches, documented the trade-off and tested an edge case with my team.'}));
    }
    assert.equal(session.status,'completed');
    assert.equal(session.turns.length,4);
    assert.equal(session.report.mode,'practice');
    assert.ok(session.report.criteria.every(c=>c.score===null));
    assert.match(session.report.disclaimer,/not an AI assessment/);
  }
  assert.equal((await request('/api/sessions')).sessions.length,6);
});
