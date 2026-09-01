import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDxwD556OJwF-otpWS0xtQsJ5yMFQbYV3E",
  authDomain: "football-picks-pool.firebaseapp.com",
  databaseURL: "https://football-picks-pool-default-rtdb.firebaseio.com",
  projectId: "football-picks-pool",
  storageBucket: "football-picks-pool.firebasestorage.app",
  messagingSenderId: "289247415371",
  appId: "1:289247415371:web:7eb16e94ed896efe9351ce"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, onValue, set, get };
