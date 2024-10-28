import { Chat } from '@/components/chat';
import { AI } from './actions';
import { generateId } from 'ai'
import AccountSettings  from '@/components/settings/settings'; 


/*import { nanoid } from 'ai';
import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

 export const maxDuration = 60;

const AppPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initFirebase = async () => {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, onAuthStateChanged, signOut } = await import('firebase/auth');
      const { firebaseConfig } = await import('@/app/authentication/config');
      
      let auth;
      
      try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
      } 
      catch(error) {
        console.log('Error:', error)
        return;
      }
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUser(user);
        } else {
          router.push('/signin');
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    initFirebase();
  }, [router]);

  const handleSignOut = async () => {
    const { getAuth, signOut } = await import('firebase/auth');
    const auth = getAuth();
    await signOut(auth);
    router.push('/signin');
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return null;
  }
 */


  export const maxDuration = 60;
  
  export default function Page() {
   

   
    const id = generateId();
    //const pathname = usePathname();
    
   /* if (pathname === '/settings') {
      return <AccountSettings />;
    }
      */

    return (
      <AI initialAIState={{ chatId: id, messages: [] }}>
        <div className="chat-container">
          <Chat id={id} />
        </div>
      </AI>
    );
  }
  
