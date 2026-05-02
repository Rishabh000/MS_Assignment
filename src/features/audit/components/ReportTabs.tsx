type ReportTabsProps = {
  tabs: string[]
  activeTab: string
  onTabClick: (tab: string) => void
}

export function ReportTabs({ tabs, activeTab, onTabClick }: ReportTabsProps) {
  return (
    <nav className="border-b border-slate-200 px-6">
      <ul className="flex gap-6">
        {tabs.map((tab) => {
          const isActive = tab === activeTab
          return (
            <li key={tab}>
              <button
                type="button"
                onClick={() => onTabClick(tab)}
                className={`border-b-2 px-1 py-3 text-sm font-medium uppercase tracking-wide transition ${
                  isActive
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
