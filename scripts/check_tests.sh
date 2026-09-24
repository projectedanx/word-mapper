cd app
npx c8 node --test server.test.js
npx c8 node --test public/app.test.js > test_output.txt || true
