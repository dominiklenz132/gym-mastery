import test from 'node:test';
import assert from 'node:assert/strict';
import {COACH_MENTION,coachDraft,chatgptLink} from '../src/chatgpt-link.js';
test('exact requested mention retains its trailing ASCII space',()=>{
 assert.equal(COACH_MENTION,'@gym muster ');
 assert.equal(coachDraft(),'@gym muster ');
 assert.equal(coachDraft(' Zeig meine Pläne. '),'@gym muster Zeig meine Pläne.');
});
test('Android targets the official app; fallback stays on our site',()=>{
 const href=chatgptLink({userAgent:'Android',origin:'https://gym.test'});
 assert.ok(href.startsWith('intent://chatgpt.com/?prompt=%40gym%20muster%20&surface=work#Intent;'));
 assert.ok(href.includes('package=com.openai.chatgpt;'));
 const fallback=href.match(/S.browser_fallback_url=([^;]+)/)[1];
 assert.equal(decodeURIComponent(fallback),'https://gym.test/?chatgpt-app=unavailable');
 assert.ok(!href.includes('send=true'));
});
test('universal link carries exactly the same draft, without submitting it',()=>{
 const href=chatgptLink({origin:'https://gym.test',userAgent:'iPhone'});
 assert.equal(new URL(href).searchParams.get('prompt'),'@gym muster ');
});
