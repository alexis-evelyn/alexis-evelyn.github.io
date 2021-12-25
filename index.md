<ul markdown="0">
	{% for post in site.posts %}
		<h1><a href="{{ post.url }}">{{ post.excerpt | strip_html }}</a></h1>
		{{ post.content | remove_first:post.excerpt }}
	{% endfor %}
</ul>
