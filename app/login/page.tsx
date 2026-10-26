import { LoginForm } from "@/components/LoginForm";
import { Masthead } from "@/components/Masthead";

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Masthead compact />

        <div className="rule-double my-8" />

        <div className="bg-paper border border-rule p-7 sm:p-9">
          <h2 className="font-display text-2xl font-bold mb-1">
            Welcome home
          </h2>
          <p className="text-muted mb-7">
            This newsletter is just for our family. Type the password below to
            read it or add your own news.
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
