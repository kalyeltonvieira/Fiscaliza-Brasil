import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Validação de conexão inicial recomendada
 */
async function testConnection() {
  try {
    // Tenta ler um documento inexistente apenas para testar a conectividade
    await getDocFromServer(doc(db, 'ai_cache', 'connection_test'));
    console.log("Firebase Connected Successfully");
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}

testConnection();
