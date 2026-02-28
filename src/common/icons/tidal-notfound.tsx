import type { JSX } from 'preact'
import { h } from 'preact'

export default function TidalNotFoundIcon(
  props: JSX.SVGAttributes<SVGSVGElement>,
) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg'
      width='32'
      height='32'
      viewBox="0 0 192 192"
      fill="none"
      {...props}>
      <path style="opacity: 1; fill: none; stroke: currentcolor; stroke-opacity: 1; stroke-width: 10.7005; stroke-miterlimit: 4; stroke-dasharray: none;" d="M 28.149 5.394 C 15.588 5.394 5.497 15.49 5.497 28.013 L 5.497 163.682 C 5.497 176.205 15.608 186.302 28.149 186.302 L 164.015 186.302 C 176.556 186.302 186.666 176.205 186.666 163.682 L 186.666 28.013 C 186.688 15.49 176.556 5.394 164.015 5.394 L 28.149 5.394 Z" />
      <path d="M 96.2 99.374 L 122.594 125.773 L 96.2 152.168 L 69.803 125.773 L 96.2 99.374 Z M 43.406 46.581 L 69.803 72.978 L 43.406 99.376 L 17.011 72.978 L 43.406 46.581 Z M 148.989 46.581 L 175.385 72.978 L 148.989 99.376 L 122.593 72.978 L 96.2 99.374 L 69.803 72.976 L 96.2 46.58 L 122.593 72.975 L 148.989 46.581 Z" fill="none" style="stroke-width: 4;" stroke="currentColor" />
    </svg>
  )
}
