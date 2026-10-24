# Native ChatGPT handoff

The user's requested mention is exactly `@gym muster `, including a final ASCII U+0020 space. Do not normalize this to the product name.

Android uses a user-clicked intent URL targeting the official package com.openai.chatgpt, with an HTTPS chatgpt.com URL and a URL-encoded prompt parameter. Browser fallback stays on this site's coach help view, not on ChatGPT's website. Other operating systems use a universal HTTPS link; the OS controls app association.

The draft is also available as a read-only selectable field and explicit copy action. The native-open click attempts clipboard copying without awaiting it so the launch remains within the user gesture. No message is automatically sent. No training history or credentials are included in the link.

OpenAI's training walkthrough uses prompt and surface=work query parameters for prepared drafts:
https://developers.openai.com/training/walkthroughs/using-your-computer-and-browser

Android intent syntax and package targeting:
https://developer.chrome.com/docs/android/intents

Native app handling of a prompt and plugin mention activation are outside this site's control. A raw mention is not a guaranteed selected plugin. Physical Android device verification is still required; unit tests verify exact text, encoding, package targeting and same-origin fallback.
