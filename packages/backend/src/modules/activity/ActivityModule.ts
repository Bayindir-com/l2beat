import { HttpClient, Logger, ProjectId } from '@l2beat/shared'

import { ActivityController } from '../../api/controllers/activity/ActivityController'
import { createActivityRouter } from '../../api/routers/ActivityRouter'
import { Config } from '../../config'
import { ActivityConfig } from '../../config/Config'
import { DailyTransactionCountViewRefresher } from '../../core/activity/DailyTransactionCountViewRefresher'
import { TransactionCounter } from '../../core/activity/TransactionCounter'
import { TransactionCountingMonitor } from '../../core/activity/TransactionCountingMonitor'
import { Clock } from '../../core/Clock'
import { Metrics } from '../../Metrics'
import { Project } from '../../model'
import { DailyTransactionCountViewRepository } from '../../peripherals/database/activity/DailyTransactionCountViewRepository'
import { Database } from '../../peripherals/database/shared/Database'
import { ApplicationModule } from '../ApplicationModule'
import { createTransactionCounters } from './createTransactionCounters'

export function createActivityModule(
  config: Config,
  logger: Logger,
  http: HttpClient,
  database: Database,
  clock: Clock,
  metrics: Metrics,
): ApplicationModule | undefined {
  if (!config.activity) {
    return
  }

  const dailyCountViewRepository = new DailyTransactionCountViewRepository(
    database,
    logger,
    metrics,
  )

  const counters = createTransactionCounters(
    config,
    logger,
    http,
    database,
    clock,
    metrics,
  )

  const viewRefresher = new DailyTransactionCountViewRefresher(
    counters,
    dailyCountViewRepository,
    clock,
    logger,
  )

  const transactionCountingMonitor = new TransactionCountingMonitor(
    counters,
    clock,
    logger,
  )

  const includedInApiProjectIds = getIncludedInApiProjectIds(
    counters,
    config.projects,
    config.activity,
    logger,
  )
  const activityController = new ActivityController(
    includedInApiProjectIds,
    counters,
    dailyCountViewRepository,
    clock,
  )
  const activityV2Router = createActivityRouter(activityController)

  const start = async () => {
    if (!config.syncEnabled) {
      return
    }

    logger = logger.for('ActivityModule')
    logger.info('Starting')
    await Promise.all(counters.map((c) => c.start()))
    viewRefresher.start()
    transactionCountingMonitor.start()
    logger.info('Started')
  }

  return {
    routers: [activityV2Router],
    start,
  }
}

function getIncludedInApiProjectIds(
  counters: TransactionCounter[],
  projects: Project[],
  activity: ActivityConfig,
  logger: Logger,
): ProjectId[] {
  return counters
    .filter((counter) => {
      const explicitlyExcluded = projects.some(
        (p) =>
          p.projectId === counter.projectId &&
          p.transactionApi?.excludeFromActivityApi === true,
      )
      if (explicitlyExcluded) {
        logger.info(
          `Project ${counter.projectId.toString()} explicitly excluded from activity v2 api via config - will not be present in the response, but will continue syncing`,
        )
      }
      return activity.skipExplicitExclusion || !explicitlyExcluded
    })
    .map((c) => c.projectId)
}
