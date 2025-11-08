import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How do I enroll in a course?',
    answer:
      "To enroll, go to the 'Marketplace', find a course you're interested in, and click 'Add to Cart'. You can then complete the purchase using your CAB tokens from the cart icon in the top-right corner.",
  },
  {
    question: 'What are CAB tokens?',
    answer:
      'CAB tokens are the currency used on this platform to enroll in courses and modules. You receive an initial amount when you sign up, and you may be awarded more upon completing certain achievements.',
  },
  {
    question: 'How do I take an exam?',
    answer:
      "Once you've enrolled in a course, it will appear under 'My Courses'. From there, you can click the 'Start Exam' button to begin the examination process. Make sure you are in a quiet environment and have a stable internet connection.",
  },
  {
    question: 'Where can I see my exam results?',
    answer:
      "All of your past exam attempts, scores, and results (pass/fail) are available on the 'My History' page.",
  },
  {
    question: 'What is a Master Certificate?',
    answer:
      "A Master Certificate is a higher-level qualification awarded for completing a specific group of required courses, also known as a Roadmap. You can view your progress towards these on the 'My Qualifications' page.",
  },
  {
    question: 'Is the exam proctored?',
    answer:
      'Yes, all exams are remotely proctored using your webcam to ensure the integrity of the examination process. Please ensure you grant camera permissions when prompted.',
  },
];

export default function FaqsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground mt-1">
          Find answers to common questions about ExamplifyAI.
        </p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem value={`item-${index}`} key={index}>
            <AccordionTrigger className="text-left font-semibold hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
