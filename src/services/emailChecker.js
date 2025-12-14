import { auth, db } from './firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const checkEmailExists = async (email) => {
  if (!email || !email.includes('@')) {
    return { exists: false, inAuth: false, inFirestore: false };
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    // 1. Check Firebase Auth
    let inAuth = false;
    try {
      const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      inAuth = methods && methods.length > 0;
      if (inAuth) return { exists: true, inAuth: true, inFirestore: false };
    } catch (authError) {
      console.log('Auth check skipped:', authError.message);
    }
    
    // 2. Check Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);
    const inFirestore = !querySnapshot.empty;
    
    return {
      exists: inAuth || inFirestore,
      inAuth,
      inFirestore
    };
    
  } catch (error) {
    console.error('Error in checkEmailExists:', error);
    return { exists: false, inAuth: false, inFirestore: false };
  }
};

export const finalEmailCheck = async (email) => {
  const result = await checkEmailExists(email);
  return { ...result, canRegister: !result.exists };
};
