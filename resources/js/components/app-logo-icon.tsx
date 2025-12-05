import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/images/essu-removebg-preview.png"
            alt="Eastern Samar State University"
            {...props}
            className={props.className}
        />
    );
}
