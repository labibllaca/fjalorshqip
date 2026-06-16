import { Fragment } from 'react';

interface FooterLink {
  label: string;
  url: string;
  target?: string;
}
interface FooterLinksProps {
  links: FooterLink[];
}

const FooterLinks = (props: FooterLinksProps) => {
  return (
    <>
      {props?.links?.map((link, idx) =>
        // prettier-ignore
        <Fragment key={`link-${idx}`}> [ <a href={link.url} target={link.target}>{link.label}</a> ] </Fragment>
      )}
    </>
  );
};

export default FooterLinks;
