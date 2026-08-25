import { cookies } from 'next/headers';
import LoginForm from './LoginForm';

type Lang = 'fr' | 'ar' | 'en';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get('locaos-lang')?.value;
  const lang: Lang = rawLang === 'ar' ? 'ar' : rawLang === 'en' ? 'en' : 'fr';

  return <LoginForm lang={lang} />;
}
