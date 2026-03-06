import type { JSX } from 'preact'
import { h } from 'preact'

export default function TidalIcon(
  props: JSX.SVGAttributes<SVGSVGElement>,
) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg'
      width='32'
      height='32'
      viewBox="0 0 192 192"
      fill="none"
      {...props}>
      <path
        id="path1"
        style="opacity:1;fill:currentColor;stroke:currentColor;stroke-opacity:0;stroke-width:1.058;stroke-miterlimit:4;stroke-dasharray:none"
        d="M 24.257812 0.28125 C 10.994813 0.28125 0.33984375 10.970656 0.33984375 24.222656 L 0.33984375 167.80078 C 0.33984375 181.05278 11.016813 191.74219 24.257812 191.74219 L 167.71875 191.74219 C 180.95875 191.74219 191.63672 181.05278 191.63672 167.80078 L 191.63672 24.222656 C 191.65972 10.970656 180.95875 0.28125 167.71875 0.28125 L 24.257812 0.28125 z M 43.40625 46.582031 L 69.808594 72.972656 L 96.199219 46.582031 L 122.58984 72.972656 L 148.99219 46.582031 L 175.38281 72.972656 L 148.99219 99.375 L 122.58984 72.972656 L 96.199219 99.375 L 122.58984 125.77734 L 96.199219 152.16797 L 69.808594 125.77734 L 96.199219 99.375 L 69.808594 72.972656 L 43.40625 99.375 L 17.015625 72.972656 L 43.40625 46.582031 z " />
    </svg>
  )
}
