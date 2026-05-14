export default function AuthPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
          New Economy Index
        </p>
        <h1 className="text-xl font-bold text-white mb-2">Connect Upstox</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Upstox access tokens expire daily at midnight IST.
          Click below to re-authenticate and restore live data.
        </p>
        <a
          href="/api/auth/upstox"
          className="inline-block w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Login with Upstox
        </a>
        <p className="mt-6 text-xs text-zinc-600">
          You will be redirected to Upstox to authorise this app.
          After login you&apos;ll return here automatically.
        </p>
      </div>
    </div>
  );
}
