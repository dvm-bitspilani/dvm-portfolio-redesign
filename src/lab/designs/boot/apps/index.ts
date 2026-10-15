import type { App, RouteId } from '../engine/engine'
import { ContactApp } from './contact'
import { HomeApp } from './home'
import { JournalApp } from './journal'
import { ProjectApp } from './project'
import { TeamApp } from './team'
import { WorkApp } from './work'

export function makeApp(id: RouteId): App {
  switch (id) {
    case 'work':
      return new WorkApp()
    case 'project':
      return new ProjectApp()
    case 'team':
      return new TeamApp()
    case 'journal':
      return new JournalApp()
    case 'contact':
      return new ContactApp()
    default:
      return new HomeApp()
  }
}
