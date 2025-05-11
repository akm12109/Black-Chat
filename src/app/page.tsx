import { redirect } from 'next/navigation';

export default function Home() {
  // In a real app, you might check auth status here and redirect accordingly
  // For now, always redirect to login
  redirect('/login');
  return null; // redirect() throws an error, so this won't be reached
}
