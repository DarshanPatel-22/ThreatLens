import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const [pass, setPass] = useState("");
  const router = useRouter();
  const handleSubmit = (e) => {
    e.preventDefault();
    if (pass === "admin123") {
      localStorage.setItem("auth", "true");
      router.push("/");
    } else {
      alert("Wrong password");
    }
  };
  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 p-8 rounded-xl shadow-md w-96"
      >
        <h1 className="text-white text-2xl mb-6">SOC Login</h1>
        <input
          type="password"
          placeholder="Enter password"
          className="w-full p-2 rounded bg-slate-700 text-white"
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 mt-4 rounded"
        >
          Login
        </button>
      </form>
    </div>
  );
}
