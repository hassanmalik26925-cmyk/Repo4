// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDDjnqNNUGSSWV4DKbreoONz0uHTym8DYk",
  authDomain: "xprofitlens-41be8.firebaseapp.com",
  projectId: "xprofitlens-41be8",
  storageBucket: "xprofitlens-41be8.firebasestorage.app",
  messagingSenderId: "33273321318",
  appId: "1:33273321318:web:88f83905673e39daa8daa7",
  measurementId: "G-KK23L5JRVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const signInWithGoogle = () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log(result.user);
    })
    .catch((error) => {
      console.error(error);
    });
};
