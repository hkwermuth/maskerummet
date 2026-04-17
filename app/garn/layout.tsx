// Layout for alle /garn/* sider — arver nav/footer fra root layout.
// Giver kun en max-width content-wrapper konsistent med katalog-designet.
export default function GarnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {children}
    </div>
  )
}
