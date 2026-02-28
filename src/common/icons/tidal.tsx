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
      <path style="opacity: 1; fill: currentcolor; stroke: currentcolor; stroke-opacity: 0; stroke-width: 1.058; stroke-miterlimit: 4; stroke-dasharray: none;" d="M 24.26 0.278 C 10.997 0.278 0.342 10.965 0.342 24.217 L 0.342 167.803 C 0.342 181.055 11.019 191.742 24.26 191.742 L 167.724 191.742 C 180.964 191.742 191.642 181.055 191.642 167.803 L 191.642 24.217 C 191.665 10.965 180.964 0.278 167.724 0.278 L 24.26 0.278 Z" />
      <path d="M 96.2 99.374 L 122.594 125.773 L 96.2 152.168 L 69.803 125.773 L 96.2 99.374 Z M 43.406 46.581 L 69.803 72.978 L 43.406 99.376 L 17.011 72.978 L 43.406 46.581 Z M 148.989 46.581 L 175.385 72.978 L 148.989 99.376 L 122.593 72.978 L 96.2 99.374 L 69.803 72.976 L 96.2 46.58 L 122.593 72.975 L 148.989 46.581 Z" fill="#FFF" style="stroke-width: 1;" />
    </svg>
  )
}
