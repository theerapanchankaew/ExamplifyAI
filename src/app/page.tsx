import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to student dashboard by default for this version
  redirect('/student-dashboard');
}
