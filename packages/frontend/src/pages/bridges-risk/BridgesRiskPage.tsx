import React from 'react'

import { Footer, FooterProps, Navbar, NavbarProps } from '../../components'
import { About } from '../../components/About'
import { BridgesMvpWarning } from '../../components/BridgesMvpWarning'
import { RiskHeader } from '../../components/header/RiskHeader'
import { IncludeLayer2sCheckbox } from '../../components/IncludeLayer2sCheckbox'
import { BridgesNavigationTabs } from '../../components/navigation-tabs/BridgesNavigationTabs'
import { PageContent } from '../../components/PageContent'
import { BridgesRiskView, BridgesRiskViewProps } from './BridgesRiskView'

export interface BridgesRiskPageProps {
  riskView: BridgesRiskViewProps
  footer: FooterProps
  navbar: NavbarProps
}

export function BridgesRiskPage(props: BridgesRiskPageProps) {
  return (
    <>
      <Navbar {...props.navbar} />
      <PageContent>
        <BridgesNavigationTabs selected="risk" />
        <main>
          <RiskHeader />
          <BridgesMvpWarning />
          <IncludeLayer2sCheckbox className="mt-8 -mb-4" />
          <BridgesRiskView {...props.riskView} />
          <About />
        </main>
      </PageContent>
      <Footer {...props.footer} />
    </>
  )
}
