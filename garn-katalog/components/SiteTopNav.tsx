 'use client'
 
import Image from 'next/image'
 import Link from 'next/link'
 
 const MAIN_TABS: { id: string; label: string; href: string }[] = [
   { id: 'hjem', label: 'Hjem', href: '/#hjem' },
   { id: 'garnlager', label: 'Garnlager', href: '/#garnlager' },
   { id: 'arkiv', label: 'Færdige projekter', href: '/#arkiv' },
   { id: 'findgarn', label: 'Find garn', href: '/#findgarn' },
   { id: 'visualizer', label: 'Prøv garn', href: '/#visualizer' },
   { id: 'faq', label: 'FAQ', href: '/#faq' },
 ]
 
 export function SiteTopNav() {
   return (
    <nav className="bg-oldrose text-cream">
       <div className="max-w-5xl mx-auto px-5 h-[60px] flex items-end gap-1">
         <Link
           href="/"
          className="pb-[12px] mr-4 flex-shrink-0 inline-flex items-end"
         >
          <Image
            src="/brand/striq-logo-hvid.png"
            alt="STRIQ"
            width={140}
            height={32}
            style={{ height: 26, width: 'auto' }}
            priority
          />
         </Link>
 
         {MAIN_TABS.map((t) => (
           <a
             key={t.id}
             href={t.href}
            className="bg-transparent text-cream/85 hover:text-cream rounded-t-md px-4 py-2 text-[13px] font-normal tracking-wide transition-colors inline-block"
           >
             {t.label}
           </a>
         ))}
 
         <Link
           href="/"
           className="bg-cream text-forest rounded-t-md px-4 py-2 text-[13px] font-medium tracking-wide inline-block"
           aria-current="page"
         >
           Garn-katalog
         </Link>
 
         <div className="flex-1" />
       </div>
     </nav>
   )
 }

