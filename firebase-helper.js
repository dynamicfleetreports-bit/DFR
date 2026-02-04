// Firebase Helper - Drop-in replacement for localStorage
// This file initializes Firebase and provides helper functions to replace localStorage calls

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

// Helper functions to replace localStorage
window.cloudStorage = {
    // Save data to cloud (replaces localStorage.setItem)
    async setItem(key, value) {
        try {
            const docRef = doc(db, 'fleet-storage', key);
            await setDoc(docRef, { 
                value: value,
                timestamp: new Date().toISOString()
            });
            console.log(`✅ Saved to cloud: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${key}:`, error);
            return false;
        }
    },

    // Get data from cloud (replaces localStorage.getItem)
    async getItem(key) {
        try {
            const docRef = doc(db, 'fleet-storage', key);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                console.log(`✅ Loaded from cloud: ${key}`);
                return docSnap.data().value;
            } else {
                console.log(`⚠️ No data found for: ${key}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error loading ${key}:`, error);
            return null;
        }
    },

    // Remove data from cloud (replaces localStorage.removeItem)
    async removeItem(key) {
        try {
            const docRef = doc(db, 'fleet-storage', key);
            await deleteDoc(docRef);
            console.log(`✅ Deleted from cloud: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Error deleting ${key}:`, error);
            return false;
        }
    },

    // Clear all data (replaces localStorage.clear)
    async clear() {
        try {
            const querySnapshot = await getDocs(collection(db, 'fleet-storage'));
            const deletePromises = [];
            querySnapshot.forEach((doc) => {
                deletePromises.push(deleteDoc(doc.ref));
            });
            await Promise.all(deletePromises);
            console.log(`✅ Cleared all cloud storage`);
            return true;
        } catch (error) {
            console.error(`❌ Error clearing storage:`, error);
            return false;
        }
    },

    // Get all keys (replaces Object.keys(localStorage))
    async getAllKeys() {
        try {
            const querySnapshot = await getDocs(collection(db, 'fleet-storage'));
            const keys = [];
            querySnapshot.forEach((doc) => {
                keys.push(doc.id);
            });
            console.log(`✅ Loaded ${keys.length} keys from cloud`);
            return keys;
        } catch (error) {
            console.error(`❌ Error loading keys:`, error);
            return [];
        }
    }
};

// Expose Firestore directly for advanced usage
window.db = db;
window.firestoreDoc = doc;
window.firestoreGetDoc = getDoc;
window.firestoreSetDoc = setDoc;
window.firestoreCollection = collection;
window.firestoreGetDocs = getDocs;
window.firestoreDeleteDoc = deleteDoc;
window.firestoreUpdateDoc = updateDoc;

console.log('🔥 Firebase initialized and ready!');