import './style.css';
import MapComponent from "./Map"
import { ReactNode } from 'react';
import Image from 'next/image.js';
import logo511 from '../../public/511SFBay_color_reversed_web.png';
import Link from 'next/link.js';

export default function MapLayout({
    children
}: {
    children: ReactNode
}) {
    return (
        <>
            <header>
                <h1>OnTime Transit</h1>
            </header>
            {children}
            <footer>
                <p>Powered by:</p>
                <Link target='_blank' href='https://511.org/open-data/transit'>
                    <Image src={logo511} alt='511 SF Bay' />
                </Link>
            </footer>
        </>
    )
}