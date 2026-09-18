export default function AdminHome() {
  return (
    <main className="min-h-screen">
      <div className="flex">
        <aside className="w-64 bg-white border-r min-h-screen p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">TELND Admin</h2>
          <nav className="space-y-1">
            <a href="/" className="block px-3 py-2 rounded-md bg-primary-50 text-primary-700 font-medium">
              Dashboard
            </a>
            <a href="/users" className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              Users
            </a>
            <a href="/companies" className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              Companies
            </a>
            <a href="/jobs" className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              Jobs
            </a>
            <a href="/reports" className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              Reports
            </a>
          </nav>
        </aside>
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Admin dashboard will be implemented here.</p>
        </div>
      </div>
    </main>
  );
}
