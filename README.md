# SAHAS — My Secret Friend

SAHAS (Safe Anonymous Help And Support) is a simple AI chatbot that helps students think through college concerns such as exams, attendance, backlogs, and loneliness. It is designed for first-time and non-technical users: no account or technical knowledge is needed. Ask one question to get a supportive reply and a practical next step.

Each message is a separate question. Earlier messages visible in the current browser tab are not sent as context, and the AI does not remember them. SAHAS does not save chat history; use **Clear chat** or close the tab to remove the visible conversation. Messages are sent to Google Gemini to generate replies, so avoid sharing your name or other identifying details. Voice recordings are sent to Gemini for transcription. Google handles those requests under its applicable terms and policies.

The **Try an example question** button fills in a sample for you to review and send. Keyboard users can use **Skip to the chat** to move directly to the message box.

## Run locally

1. Install Node.js 20.6 or newer.
2. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
3. Create a `.env` file in this project folder with your key and model:

   ```powershell
   notepad .env
   ```

   Add these lines, replacing the key placeholder with your own Gemini API key:

   ```dotenv
   GEMINI_API_KEY=your-google-ai-studio-api-key
   GEMINI_MODEL=gemini-3.5-flash-lite
   PORT=3000
   ```

4. Start the app:

   ```powershell
   npm install
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000).

The Gemini key stays on the Node.js server and is never sent to the browser. Do not commit `.env` or expose the key in client-side code. SAHAS uses Google's Interactions API with `store: false`, so Gemini does not retain these chat interactions. To use a different Gemini model, update `GEMINI_MODEL` in `.env`.

Run the automated server/API checks with `npm test`.

SAHAS is configured to reply in English, Telugu, Hindi, or Tamil based on the language of your question. It also recognizes common Roman-letter spellings of Telugu, Hindi, and Tamil. Replies are kept short; if an AI reply is cut off before completing a sentence, the app asks you to try again rather than showing a fragment.

Text questions receive written replies. Select the microphone button once to start voice input and allow microphone access. SAHAS detects a short pause after you finish each spoken message, transcribes and sends it automatically, speaks its reply, and starts listening for your next message without another click. Each spoken message is also handled independently. Select the microphone again to end the voice chat. If silence is detected before speech, SAHAS resumes listening; recordings stop automatically after 60 seconds.

## Deploy to Vercel

This project uses Vercel Functions for `/api/chat` and `/api/transcribe`; the static chat page is served from the project root. To deploy:

1. Push this repository to GitHub.
2. Sign in to [Vercel](https://vercel.com/new) and import `ramprasadvaraha-droid/SAHAS-My-Secret-Friend`.
3. In the project setup or **Settings → Environment Variables**, add `GEMINI_API_KEY` with your key. Never put the key in a source file or commit it to GitHub.
4. Deploy the project, then open the `vercel.app` URL Vercel displays.

Vercel runs each API route as a Node.js Function, configured for up to 120 seconds. Audio uploads are limited to 4 MB to stay within serverless request-body limits. For local development or a traditional Node.js host, use `npm start`; the existing Render Blueprint at [`render.yaml`](./render.yaml) is also available.

## Student safety and privacy

SAHAS is a supportive companion, not a therapist or emergency service. Messages are sent to Google Gemini, and Google's handling of those requests is subject to its applicable terms and policies. SAHAS does not persist conversation history. Voice recordings are sent to Gemini for transcription and are not saved by SAHAS. Crisis-related messages detected by the app receive a local support response instead of being sent to Gemini; the server also checks for common crisis phrases.
