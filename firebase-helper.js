// Firebase Helper - Drop-in replacement for localStorage
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC7wWkArf06LSrJnqNRYxjPJJyV659Z2gw",
    authDomain: "dynamic-fleet-reporting.firebaseapp.com",
    projectId: "dynamic-fleet-reporting",
    storageBucket: "dynamic-fleet-reporting.firebasestorage.app",
    messagingSenderId: "167911673918",
    appId: "1:167911673918:web:8315ef1ba74b78b949c16f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.cloudStorage = {
    async setItem(key, value) {
        try {
            const docRef = doc(db, 'fleet-storage', key);
            await setDoc(docRef, { value: value, timestamp: new Date().toISOString() });
            return true;
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            return false;
        }
    },
    async getItem(key) {
        try {
            const docRef = doc(db, 'fleet-storage', key);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().value : null;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            return null;
        }
    },
    async removeItem(key) {
        try {
            const docRef = doc(db, 'fleet-storage', key);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error(`Error deleting ${key}:`, error);
            return false;
        }
    },
    async clear() {
        try {
            const querySnapshot = await getDocs(collection(db, 'fleet-storage'));
            await Promise.all(querySnapshot.docs.map(d => deleteDoc(d.ref)));
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },
    async getAllKeys() {
        try {
            const querySnapshot = await getDocs(collection(db, 'fleet-storage'));
            return querySnapshot.docs.map(d => d.id);
        } catch (error) {
            console.error('Error loading keys:', error);
            return [];
        }
    }
};

window.db = db;
window.firestoreDoc = doc;
window.firestoreGetDoc = getDoc;
window.firestoreSetDoc = setDoc;
window.firestoreCollection = collection;
window.firestoreGetDocs = getDocs;
window.firestoreDeleteDoc = deleteDoc;
window.firestoreUpdateDoc = updateDoc;
