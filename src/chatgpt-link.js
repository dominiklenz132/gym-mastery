// Keep the user's exact spelling AND final ASCII space.
export const COACH_MENTION='@gym muster ';
export function coachDraft(question=''){return COACH_MENTION+question.trim()}
export function chatgptLink({question='',userAgent='',origin}){
 const query='prompt='+encodeURIComponent(coachDraft(question))+'&surface=work';
 if(/Android/i.test(userAgent)){
  // Native package targeting prevents silently reopening ChatGPT's website.
  const fallback=new URL('/?chatgpt-app=unavailable',origin).href;
  return 'intent://chatgpt.com/?'+query+'#Intent;scheme=https;package=com.openai.chatgpt;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url='+encodeURIComponent(fallback)+';end';
 }
 // Universal link: the OS decides whether to use an installed app.
 return 'https://chatgpt.com/?'+query;
}
