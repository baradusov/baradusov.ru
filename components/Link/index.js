import NextLink from 'next/link';

const Link = (props) => {
  const { href, ...restProps } = props;

  const isExternalLink = (uri) => {
    return uri.startsWith('http') || uri.startsWith('mailto');
  };

  return isExternalLink(href) ? (
    <a {...props} />
  ) : (
    <NextLink href={href}>
      <a {...restProps} />
    </NextLink>
  );
};

export default Link;
