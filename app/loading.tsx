export default function Loading() {
  return <div className="mx-auto w-full max-w-[1600px] animate-pulse space-y-6 px-4 py-5 sm:px-7 lg:px-9"><div className="h-48 rounded-3xl bg-white/70" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-white/70" />)}</div><div className="grid gap-5 xl:grid-cols-2"><div className="h-80 rounded-2xl bg-white/70" /><div className="h-80 rounded-2xl bg-white/70" /></div></div>;
}
