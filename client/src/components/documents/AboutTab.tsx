function AboutTab({ description }: { description: string | null }) {
   return <div>{description ? description : 'No description provided.'}</div>;
}

export default AboutTab;
