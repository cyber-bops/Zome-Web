'use client'

import { useState } from 'react'
import type { Purse } from '@/server/api'
import { Activity, Filters, type Filter } from '../activity-list'

// Everything that moved in the Care Purse, by day.
export function ActivityPage({ purse }: { purse: Purse | null }) {
  const [filter, setFilter] = useState<Filter>('all')
  return (
    <div className="m-page">
      <h1 className="m-title">Activity</h1>
      {purse ? (
        <>
          <Filters value={filter} set={setFilter} all />
          <div className="m-list"><Activity purse={purse} filter={filter} /></div>
        </>
      ) : <p className="none">Care Purse isn’t open to you yet.</p>}
    </div>
  )
}
