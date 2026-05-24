import app from './server/app.js';

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Portal server running on http://localhost:${port}`);
});
