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

## Deploy to Render

This project includes a Render Blueprint at [`render.yaml`](./render.yaml). To deploy:

1. Push this repository to GitHub.
2. Open the [SAHAS Render Blueprint](https://render.com/deploy?repo=https://github.com/ramprasadvaraha-droid/SAHAS-My-Secret-Friend) and sign in to Render.
3. Review the service settings. Render will ask for `GEMINI_API_KEY`; enter your key directly into Render's private setup form. Never add it to `render.yaml` or commit it to GitHub.
4. Select **Deploy Blueprint** and wait for the build and health check to finish.
5. Open the public `onrender.com` URL Render displays for the service.

The Blueprint runs the Node.js server with `HOST=0.0.0.0`, uses `npm ci` to install dependencies, and configures `/` as its health check. The free service may spin down when idle and take a short time to wake on the next visit. To host somewhere else, configure a Node.js web service with `npm ci`, `npm start`, `HOST=0.0.0.0`, and a private `GEMINI_API_KEY` environment variable. Hosting `index.html` alone as a static site will not provide the chat API.

## Student safety and privacy

SAHAS is a supportive companion, not a therapist or emergency service. Messages are sent to Google Gemini, and Google's handling of those requests is subject to its applicable terms and policies. SAHAS does not persist conversation history. Voice recordings are sent to Gemini for transcription and are not saved by SAHAS. Crisis-related messages detected by the app receive a local support response instead of being sent to Gemini; the server also checks for common crisis phrases.
