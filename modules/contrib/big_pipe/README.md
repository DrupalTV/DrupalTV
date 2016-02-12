# Installation

Install like any other Drupal module.


# Recommendations

It is strongly recommended to also enable the Dynamic Page Cache module that is included with Drupal 8 core.


# Relation to Page Cache & Dynamic Page Cache modules in Drupal 8 core

- Page Cache (`page_cache`): no relation to BigPipe.
- Dynamic Page Cache (`dynamic_page_cache`): if a page is cached in the Dynamic Page Cache, BigPipe is able to send the main content much faster. It contains exactly the things that BigPipe still needs to do


# Documentation

- During rendering, the personalized parts are turned into placeholders.
- By default, we use the Single Flush strategy for replacing the placeholders. i.e. we don't send a response until we've replaced them all.
- BigPipe introduces a new strategy, that allows us to flush the initial page first, and then _stream_ the replacements for the placeholders.
- This results in hugely improved front-end/perceived performance (watch the 40-second on the project page).

There is no detailed documentation about BigPipe yet, but all of the following documentation is relevant, because it covers the principles/architecture that the BigPipe module is built upon.

- <https://www.drupal.org/developing/api/8/render/pipeline>
- <https://www.drupal.org/developing/api/8/render/arrays/cacheability>
- <https://www.drupal.org/developing/api/8/render/arrays/cacheability/auto-placeholdering>
- <https://www.drupal.org/documentation/modules/dynamic_page_cache>
- <https://www.facebook.com/notes/facebook-engineering/bigpipe-pipelining-web-pages-for-high-performance/389414033919>



---



# Environment requirements

- BigPipe uses streaming, this means any proxy in between should not buffer the response: the origin needs to stream directly to the end user.
- Hence the web server and any proxies should not buffer the response, or otherwise the end result is still a single flush, which means worse performance again.
- BigPipe responses contain the header `Surrogate-Control: no-store, content="BigPipe/1.0"`. For more information about this header, see <https://www.w3.org/TR/edge-arch/>.

Note that this version number (`BigPipe/1.0`) is not expected to increase, since all that is necessary for a proxy to support BigPipe, is the absence of buffering. No additional proxy requirements are expected to ever be added.


## Apache

When using Apache, there is nothing to do: no buffering by default.


## FastCGI

When using FastCGI, you must disable its buffering.

- When using Apache+FastCGI, [set `FcgidOutputBufferSize` to `0`](https://httpd.apache.org/mod_fcgid/mod/mod_fcgid.html#fcgidoutputbuffersize):
```
<IfModule mod_fcgid.c>
  FcgidOutputBufferSize 0
</IfModule>
```
- When using Nginx+FastCGI, [set `fastcgi_buffering` to `off`](http://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_buffering).


## IIS

When using IIS, you must [disable its buffering](https://support.microsoft.com/en-us/kb/2321250).

## Varnish

When using Varnish, the following VCL disables buffering only for BigPipe responses:

```
vcl_backend_response {
  if (beresp.Surrogate-Control ~ "BigPipe/1.0") {
    set beresp.do_stream = true;
    set beresp.ttl = 0s;
  }
}
```

and for Varnish <4:

```
vcl_fetch {
  if (beresp.Surrogate-Control ~ "BigPipe/1.0") {
    set beresp.do_stream = true;
    set beresp.ttl = 0;
  }
}
```

Note that the `big_pipe_nojs` cookie does *not* break caching. Varnish should let that cookie pass through.


## Nginx

When using Nginx, the BigPipe module already sends a `X-Accel-Buffering: no` header for BigPipe responses, which disables buffering.

Alternatively, it is possible to [disable proxy buffering explicitly](http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering).


## Other web servers and (reverse) proxies

Other web servers and (reverse) proxies, including CDNs, need to be configured in a similar way.

Buffering will nullify the improved front-end performance. This means that users accessing the site via a ISP-installed proxy will not benefit. But the site won't break either.
