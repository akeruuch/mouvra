import type {AnchorHTMLAttributes,MouseEvent} from 'react';
import {navigate,siteHref} from './navigation';

type Props=AnchorHTMLAttributes<HTMLAnchorElement>&{href:string};
export default function Link({href,onClick,...rest}:Props){
  function click(event:MouseEvent<HTMLAnchorElement>){
    onClick?.(event);
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||rest.target||!href.startsWith('/'))return;
    event.preventDefault();navigate(href);
  }
  return <a {...rest} href={href.startsWith('/')?siteHref(href):href} onClick={click}/>;
}
