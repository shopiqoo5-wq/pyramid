import mongoose from 'mongoose';

const uri = "mongodb+srv://veer:xFg77dEF4PcNFGxP@cluster0.1q2bjm7.mongodb.net/pyramidfm?retryWrites=true&w=majority&appName=Cluster0";

async function test() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected successfully!');
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

test();
