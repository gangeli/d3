
paper.pdf: $(wildcard *.tex) ref.bib
	@pdflatex paper
	@bibtex paper
	@pdflatex paper
	@pdflatex paper

clean:
	rm -f *.aux *.log *.bbl *.blg *.pdf *.bak

default: paper.pdf
