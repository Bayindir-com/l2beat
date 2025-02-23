import { ProjectId } from '@l2beat/shared'

import {
  KnowledgeNugget,
  Milestone,
  ProjectContracts,
  ProjectEscrow,
  ProjectLinks,
  ProjectPermission,
} from '../../common'
import { Layer2Event } from './Layer2Event'
import { Layer2Rating } from './Layer2Rating'
import { Layer2RiskView } from './Layer2RiskView'
import { Layer2Technology } from './Layer2Technology'
import { Layer2TransactionApi } from './Layer2TransactionApi'

export interface Layer2 {
  type: 'layer2'
  /** Unique, readable id, will be used in DB. DO NOT EDIT THIS PROPERTY */
  id: ProjectId
  /** Information displayed about the layer2 on the frontend */
  display: Layer2Display
  /** Information required to calculate the stats of the layer2 */
  config: Layer2Config
  /** Risk view values for this layer2 */
  riskView: Layer2RiskView
  /** Deep dive into layer2 technology */
  technology: Layer2Technology
  /** List of smart contracts used in the layer2 */
  contracts: ProjectContracts
  /** List of permissioned addresses */
  permissions?: ProjectPermission[]
  /** Links to recent developments, milestones achieved by the project */
  milestones?: Milestone[]
  /** List of knowledge nuggets: useful articles worth reading */
  knowledgeNuggets?: KnowledgeNugget[]
  /** Rollup maturity rating data */
  rating?: Layer2Rating
}

export interface Layer2Display {
  /** Name of the layer2, will be used as a display name on the website */
  name: string
  /** Url friendly layer2 name, will be used in website urls */
  slug: string
  /** A warning displayed at the top of the layer2 page */
  warning?: string
  /** A few sentences describing the layer2 */
  description: string
  /** A short (<20 characters) description of the use case */
  purpose: string
  /** List of links */
  links: ProjectLinks
  /** Where does the activity data come from? */
  activityDataSource?: string
}

export interface Layer2Config {
  /** Symbols of the tokens associated with this layer2 */
  associatedTokens?: string[]
  /** List of contracts in which L1 funds are locked */
  escrows: ProjectEscrow[]
  /** Metadata about events emitted by the system */
  events: Layer2Event[]
  /** API parameters used to get transaction count */
  transactionApi?: Layer2TransactionApi
}
