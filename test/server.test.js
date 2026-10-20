const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { createServer, createVercelHandler } = require('../server');

const apiKey = 'test-api-key';
const model = 'gemini-test-model';
let server;
let baseUrl;
let geminiCalls;
let geminiFetch;

before(async () => {
  server = createServer({
    apiKey,
    model,
    fetchImpl: (...args) => {
      geminiCalls.push(args);
      return geminiFetch(...args);
    }
  });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
  geminiCalls = [];
  geminiFetch = async () => Response.json({
    steps: [{ type: 'model_output', content: [{ type: 'text', text: 'A supportive reply.' }] }]
  });
});

async function postJson(path, payload) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

test('serves the app with the text-first chat and voice features', async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.match(html, /No technical knowledge or account is needed/);
  assert.match(html, /How to use it/);
  assert.match(html, /the AI does not remember earlier messages/);
  assert.match(html, /SAHAS is an AI helper\. Messages stay here until you clear the chat\./);
  assert.doesNotMatch(html, /Your message is sent to an AI service/);
  assert.match(html, /Your recording is sent to an external AI service/);
  assert.doesNotMatch(html, /Google Gemini|Gemini/);
  assert.match(html, /Try an example question/);
  assert.match(html, /We’ll fill in a sample\. Review it, then choose Send\./);
  assert.match(html, /Skip to the chat/);
  assert.match(html, /role="log" aria-live="polite"/);
  assert.match(html, /Tap the microphone once for hands-free voice chat/);
  assert.doesNotMatch(html, /College can feel like a lot sometimes/);
});

test('sends only the latest question to Gemini without storing the interaction', async () => {
  const response = await postJson('/api/chat', {
    messages: [{ role: 'user', parts: [{ text: 'My exams.' }] }]
  });
  const result = await response.json();
  const [url, request] = geminiCalls[0];
  const body = JSON.parse(request.body);

  assert.equal(response.status, 200);
  assert.equal(result.reply, 'A supportive reply.');
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(request.headers['x-goog-api-key'], apiKey);
  assert.equal(body.model, model);
  assert.equal(body.store, false);
  assert.match(body.system_instruction, /under 45 words/);
  assert.match(body.system_instruction, /Avoid generic openings/);
  assert.equal(body.generation_config.max_output_tokens, 512);
  assert.match(body.system_instruction, /Reply only in English/);
  assert.match(body.system_instruction, /complete, natural sentences; never stop mid-sentence/);
  assert.equal(body.input, 'Student: My exams.');
});

test('locks replies to the question language and script', async () => {
  const samples = [
    { text: 'I feel worried about exams.', languageInstruction: 'Reply only in English.' },
    { text: 'పరీక్షల గురించి ఆందోళనగా ఉంది.', languageInstruction: 'Reply only in Telugu, using Telugu script.' },
    { text: 'मुझे परीक्षा की चिंता है।', languageInstruction: 'Reply only in Hindi, using Devanagari script.' },
    { text: 'தேர்வு பற்றி கவலையாக உள்ளது.', languageInstruction: 'Reply only in Tamil, using Tamil script.' },
    { text: 'naaku exams ante chala tension ga undi', languageInstruction: 'Reply only in Telugu, using Telugu script.' },
    { text: 'mujhe pariksha ki chinta hai', languageInstruction: 'Reply only in Hindi, using Devanagari script.' },
    { text: 'aap kaise ho', languageInstruction: 'Reply only in Hindi, using Devanagari script.' },
    { text: 'enakku exam pathi romba kavalai', languageInstruction: 'Reply only in Tamil, using Tamil script.' },
    { text: 'ನನಗೆ ಪರೀಕ್ಷೆಯ ಬಗ್ಗೆ ಚಿಂತೆ ಇದೆ.', languageInstruction: 'Reply in the same language and writing system used by the student.' }
  ];

  for (const sample of samples) {
    const response = await postJson('/api/chat', {
      messages: [{ role: 'user', parts: [{ text: sample.text }] }]
    });
    const body = JSON.parse(geminiCalls.at(-1)[1].body);

    assert.equal(response.status, 200);
    assert.ok(body.system_instruction.includes(sample.languageInstruction), sample.text);
  }
});

test('serves chat through a Vercel Web API handler', async () => {
  const handler = createVercelHandler('chat', {
    apiKey,
    model,
    fetchImpl: async () => Response.json({
      steps: [{ type: 'model_output', content: [{ type: 'text', text: 'A short reply.' }] }]
    })
  });
  const response = await handler(new Request('https://example.test/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', parts: [{ text: 'Hello.' }] }] })
  }));

  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await response.json(), { reply: 'A short reply.' });
});

test('serves transcription through a Vercel Web API handler', async () => {
  const handler = createVercelHandler('transcribe', {
    apiKey,
    model,
    fetchImpl: async () => Response.json({
      candidates: [{ content: { parts: [{ text: 'Hello from voice.' }] } }]
    })
  });
  const response = await handler(new Request('https://example.test/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' },
    body: Buffer.from('test audio')
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { transcript: 'Hello from voice.' });
});

test('returns only complete sentences and rejects a wholly incomplete reply', async () => {
  geminiFetch = async () => Response.json({
    steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ஒரு சிறிய தலைப்பை முதலில் படியுங்கள். பிறகு உங்களுக்கு' }] }]
  });
  const completeSentenceResponse = await postJson('/api/chat', {
    messages: [{ role: 'user', parts: [{ text: 'தேர்வு பற்றி கவலையாக உள்ளது.' }] }]
  });
  const completeSentenceResult = await completeSentenceResponse.json();
  assert.equal(completeSentenceResponse.status, 200);
  assert.equal(completeSentenceResult.reply, 'ஒரு சிறிய தலைப்பை முதலில் படியுங்கள்.');

  geminiFetch = async () => Response.json({
    steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ஒரு சிறிய தலைப்பை முதலில்' }] }]
  });
  const incompleteResponse = await postJson('/api/chat', {
    messages: [{ role: 'user', parts: [{ text: 'தேர்வு பற்றி கவலையாக உள்ளது.' }] }]
  });
  const incompleteResult = await incompleteResponse.json();
  assert.equal(incompleteResponse.status, 502);
  assert.match(incompleteResult.error, /reply came through incomplete/);
});

test('keeps crisis messages out of Gemini', async () => {
  const response = await postJson('/api/chat', {
    messages: [{ role: 'user', parts: [{ text: 'I want to kill myself' }] }]
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.crisis, true);
  assert.match(result.reply, /14416/);
  assert.equal(geminiCalls.length, 0);
});

test('rejects chat history to prevent prior messages from becoming model context', async () => {
  const response = await postJson('/api/chat', {
    messages: [
      { role: 'user', parts: [{ text: 'I want to kill myself' }] },
      { role: 'model', parts: [{ text: 'Please call Tele MANAS at 14416.' }] },
      { role: 'user', parts: [{ text: 'Can you help me study?' }] }
    ]
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.match(result.error, /one message at a time/);
  assert.equal(geminiCalls.length, 0);
});

test('rejects invalid chat payloads and oversized requests', async () => {
  const invalid = await postJson('/api/chat', {
    messages: [{ role: 'assistant', parts: [{ text: 'Not a valid role' }] }]
  });
  assert.equal(invalid.status, 400);

  const oversized = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', parts: [{ text: 'a'.repeat(25_000) }] }] })
  });
  assert.equal(oversized.status, 413);
  assert.equal(geminiCalls.length, 0);
});

test('transcribes audio with Gemini and returns the transcript', async () => {
  geminiFetch = async (_url, request) => {
    const body = JSON.parse(request.body);
    assert.match(body.contents[0].parts[0].text, /Transcribe the spoken audio/);
    assert.equal(body.contents[0].parts[1].inline_data.mime_type, 'audio/wav');
    assert.equal(Buffer.from(body.contents[0].parts[1].inline_data.data, 'base64').toString(), 'test audio');
    return Response.json({
      candidates: [{ content: { parts: [{ text: 'I need help with exams.' }] } }]
    });
  };
  const response = await fetch(`${baseUrl}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' },
    body: Buffer.from('test audio')
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.transcript, 'I need help with exams.');
  assert.equal(geminiCalls.length, 1);
});

test('rejects unsupported and empty audio without calling Gemini', async () => {
  const unsupported = await fetch(`${baseUrl}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.equal(unsupported.status, 415);

  const empty = await fetch(`${baseUrl}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' }
  });
  assert.equal(empty.status, 400);
  assert.equal(geminiCalls.length, 0);
});

test('returns actionable provider errors without leaking the API key', async () => {
  geminiFetch = async () => Response.json({
    error: { message: `Invalid key ${apiKey}. Check authentication.` }
  }, { status: 401 });
  const response = await postJson('/api/chat', {
    messages: [{ role: 'user', parts: [{ text: 'Hello.' }] }]
  });
  const result = await response.json();

  assert.equal(response.status, 502);
  assert.match(result.error, /HTTP 401/);
  assert.doesNotMatch(result.error, new RegExp(apiKey));
});

test('reports missing Gemini configuration clearly', async () => {
  const unconfigured = createServer({ apiKey: '', model, fetchImpl: async () => assert.fail('Gemini should not be called') });
  unconfigured.listen(0, '127.0.0.1');
  await new Promise((resolve) => unconfigured.once('listening', resolve));
  const url = `http://127.0.0.1:${unconfigured.address().port}`;

  try {
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', parts: [{ text: 'Hello.' }] }] })
    });
    const result = await response.json();

    assert.equal(response.status, 503);
    assert.match(result.error, /GEMINI_API_KEY/);
  } finally {
    unconfigured.closeAllConnections();
    await new Promise((resolve, reject) => unconfigured.close((error) => error ? reject(error) : resolve()));
  }
});
