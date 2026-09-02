import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Reconcile API] Server running on port ${PORT}`);
});
