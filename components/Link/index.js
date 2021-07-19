import NextLink from 'next/link';

const Link = (props) => {
  const { href, ...restProps } = props;

  const isExternalLink = (uri) => {
    return uri.startsWith('http') || uri.startsWith('mailto');
  };

  return isExternalLink(href) ? (
    <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
  ) : (
    <NextLink href={href}>
      <a {...restProps} />
    </NextLink>
  );
};

export default Link;
