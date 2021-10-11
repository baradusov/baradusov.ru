import NextLink from 'next/link';

const Link = (props) => {
  const { href, ...restProps } = props;

  const isExternalLink = (uri) => {
    return uri.startsWith('http') || uri.startsWith('mailto');
  };

  const relAttr = restProps.rel
    ? `noopener noreferrer nofollow ${restProps.rel}`
    : `noopener noreferrer nofollow`;

  return isExternalLink(href) ? (
    <a {...props} target="_blank" rel={relAttr} />
  ) : (
    <NextLink href={href}>
      <a {...restProps} />
    </NextLink>
  );
};

export default Link;
