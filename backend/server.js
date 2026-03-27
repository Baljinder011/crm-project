require('dotenv').config();
const app = require('./src/app');
const { pool, testDatabaseConnection } = require('./src/config/db');
const cors = require("cors")

const PORT = process.env.PORT || 5000;
app.use(cors())


async function startServer() {
  try {
    await testDatabaseConnection();
 
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Closing server...`);
      server.close(async () => {
        try {
          await pool.end();
          console.log('Database pool closed.');
          process.exit(0);
        } catch (error) {
          console.error('Error while closing database pool:', error.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();