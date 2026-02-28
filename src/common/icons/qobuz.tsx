import type { JSX } from 'preact'
import { h } from 'preact'

export default function QobuzIcon(
    props: JSX.SVGAttributes<SVGSVGElement>,
) {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            width='32'
            height='32'
            viewBox="0 0 192 192"
            fill='none'
            {...props}>
            <path style="opacity: 1; fill: currentColor; stroke: currentcolor; stroke-opacity: 0; stroke-width: 1.05838; stroke-miterlimit: 4; stroke-dasharray: none;" d="M 23.918 0 C 10.655 0 0 10.687 0 23.939 L 0 167.525 C 0 180.777 10.677 191.464 23.918 191.464 L 167.382 191.464 C 180.622 191.464 191.3 180.777 191.3 167.525 L 191.3 23.939 C 191.323 10.687 180.622 0 167.382 0 L 23.918 0 Z" />
            <path stroke="#FFF" stroke-linecap="round" stroke-width="8" d="M140.672 157.486a76.004 76.004 0 0 1-102.464-12.128 76.001 76.001 0 0 1 107.15-107.15 76.004 76.004 0 0 1 12.128 102.464" />
            <path stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="15" stroke-width="8" d="M124.807 142.105a54.364 54.364 0 1 1 17.296-17.296" />
            <path stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="15" stroke-width="8" d="M95.997 117.193c11.705 0 21.193-9.488 21.193-21.193 0-11.704-9.488-21.193-21.193-21.193-11.704 0-21.193 9.489-21.193 21.193 0 11.705 9.489 21.193 21.193 21.193Z" />
            <path fill="currentColor" stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="15" stroke-width="3.799" d="M95.997 98.103a2.103 2.103 0 1 0 0-4.205 2.103 2.103 0 0 0 0 4.205Z" />
            <path d="m121.193 121.196 41.871 41.625Z" fill="#FFF" />
            <path stroke="#FFF" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="15" stroke-width="12" d="m121.193 121.196 41.871 41.625" />
        </svg>
    )
}
