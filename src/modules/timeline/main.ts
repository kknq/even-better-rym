import { runPage } from '~/common/pages'
import { main } from '.'

// Timeline is for artist pages
void runPage('/artist/', () => {
  void main()
})