function AboutTab({ description }: { description: string | null | undefined }) {
   return <div>{description ? description : 'No description provided.'}</div>;
}

export default AboutTab;
